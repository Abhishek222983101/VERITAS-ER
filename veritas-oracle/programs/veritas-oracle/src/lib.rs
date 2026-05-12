use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::access_control::instructions::{
    CreatePermissionCpiBuilder, DelegatePermissionCpiBuilder,
};
use ephemeral_rollups_sdk::access_control::structs::{Member, MembersArgs};
use ephemeral_rollups_sdk::anchor::ephemeral;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::create_request_randomness_ix;
use ephemeral_vrf_sdk::types::SerializableAccountMeta;
use sha2::{Digest, Sha256};

pub mod constants;
pub mod errors;
pub mod state;

use constants::*;
use errors::*;
use state::*;

declare_id!("6RE3cPuSF3XVEgLkULMpZi8vaPLdvfhQuB5esLFAQPbf");

// VRF context must be in same module as the instruction that calls invoke_signed_vrf
#[vrf]
#[derive(Accounts)]
pub struct SelectCommittee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    /// CHECK: VRF oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
    #[account(seeds = [AGENT_REGISTRY_SEED], bump)]
    pub agent_registry: Account<'info, AgentRegistry>,
}

/// VRF context for Ephemeral Rollup - uses DEFAULT_EPHEMERAL_QUEUE
#[vrf]
#[derive(Accounts)]
pub struct SelectCommitteeER<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    /// CHECK: VRF oracle queue for ephemeral rollup
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
    #[account(seeds = [AGENT_REGISTRY_SEED], bump)]
    pub agent_registry: Account<'info, AgentRegistry>,
}

#[ephemeral]
#[program]
pub mod veritas_oracle {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.treasury = ctx.accounts.treasury.key();
        config.default_query_fee = 100_000_000;
        config.committee_size = 3;
        config.consensus_threshold = 70;
        config.agent_bond_amount = 50_000_000;
        config.correct_reward = 10_000_000;
        config.wrong_penalty = 5_000_000;
        config.vrf_queue = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE;
        config.question_counter = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn init_agent_registry(ctx: Context<InitAgentRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.agent_registry;
        registry.agents = [Pubkey::default(); 20];
        registry.reputations = [0u64; 20];
        registry.count = 0;
        registry.bump = ctx.bumps.agent_registry;
        Ok(())
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        personality_hash: [u8; 32],
    ) -> Result<()> {
        require!(name.len() <= 32, VeritasError::NameTooLong);
        let agent = &mut ctx.accounts.agent;
        agent.wallet = ctx.accounts.wallet.key();
        agent.name = name;
        agent.personality_hash = personality_hash;
        agent.reputation = 500;
        agent.is_active = true;
        agent.bond_amount = ctx.accounts.config.agent_bond_amount;
        agent.total_votes = 0;
        agent.correct_votes = 0;
        agent.metaplex_nft = Pubkey::default();
        agent.sas_attestation = Pubkey::default();
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        let registry = &mut ctx.accounts.agent_registry;
        let idx = registry.count as usize;
        require!(idx < 20, VeritasError::NotEnoughAgents);
        registry.agents[idx] = ctx.accounts.wallet.key();
        registry.reputations[idx] = 500;
        registry.count += 1;

        Ok(())
    }

    pub fn submit_question(
        ctx: Context<SubmitQuestion>,
        question_text: String,
        category: String,
        deadline: i64,
    ) -> Result<()> {
        require!(question_text.len() <= 256, VeritasError::QuestionTooLong);
        require!(category.len() <= 32, VeritasError::CategoryTooLong);
        require!(
            deadline > Clock::get()?.unix_timestamp,
            VeritasError::DeadlineInPast
        );

        let config = &mut ctx.accounts.config;
        let question_id = config.question_counter;
        config.question_counter = config
            .question_counter
            .checked_add(1)
            .ok_or(VeritasError::ArithmeticOverflow)?;

        let question = &mut ctx.accounts.question;
        question.authority = ctx.accounts.asker.key();
        question.question_text = question_text;
        question.category = category;
        question.deadline = deadline;
        question.query_fee = config.default_query_fee;
        question.status = QuestionStatus::Pending;
        question.committee = [Pubkey::default(); 3];
        question.yes_votes = 0;
        question.no_votes = 0;
        question.unsure_votes = 0;
        question.result = None;
        question.confidence = 0;
        question.encrypted_result = [0u8; 64];
        question.created_at = Clock::get()?.unix_timestamp;
        question.resolved_at = 0;
        question.question_id = question_id;
        question.consensus_threshold = config.consensus_threshold;
        question.tee_validator = Pubkey::default();
        question.is_private = false;
        question.bump = ctx.bumps.question;

        let fee = config.default_query_fee;
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.asker.key(),
            &ctx.accounts.treasury.key(),
            fee,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.asker.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn update_question_status(
        ctx: Context<UpdateQuestionStatus>,
        new_status: QuestionStatus,
    ) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status.can_transition_to(&new_status),
            VeritasError::InvalidStatusTransition
        );
        question.status = new_status;
        Ok(())
    }

    pub fn delegate_question(ctx: Context<DelegateQuestion>, question_id: u64) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[QUESTION_SEED, &question_id.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn delegate_agent(ctx: Context<DelegateAgent>, agent_wallet: Pubkey) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[AGENT_SEED, agent_wallet.as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn commit_and_undelegate_question(ctx: Context<CommitAndUndelegateQuestion>) -> Result<()> {
        let question_info = ctx.accounts.question.to_account_info();
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&question_info],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }

    pub fn commit_and_undelegate_agent(ctx: Context<CommitAndUndelegateAgent>) -> Result<()> {
        let agent_info = ctx.accounts.agent.to_account_info();
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&agent_info],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }

    /// Select committee using on-chain pseudo-randomness (slot hashes)
    /// This is a pragmatic fallback when VRF is unavailable on devnet
    /// Uses recent slot hash as entropy source - verifiable but not cryptographically secure
    pub fn select_committee_simple(ctx: Context<SelectCommitteeSimple>) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::Pending,
            VeritasError::InvalidStatus
        );

        let registry = &ctx.accounts.agent_registry;
        require!(registry.count >= 3, VeritasError::NotEnoughAgents);

        // Use recent slot hash as entropy (available on-chain, verifiable)
        let slot_hashes_data = ctx.accounts.slot_hashes.data.borrow();
        let mut seed = [0u8; 32];

        if slot_hashes_data.len() >= 40 {
            // Skip 8 bytes discriminator, then read first 32 bytes of hash
            seed.copy_from_slice(&slot_hashes_data[8..40]);
            msg!("Using slot hash for committee selection");
        } else {
            // Fallback to timestamp-based entropy
            let clock = Clock::get()?;
            seed[..8].copy_from_slice(&clock.unix_timestamp.to_le_bytes());
            seed[8..16].copy_from_slice(&clock.slot.to_le_bytes());
            msg!("Using timestamp fallback for committee selection");
        }

        drop(slot_hashes_data);

        // Select committee using the seed
        let mut total_reputation: u64 = 0;
        let mut agent_list: Vec<(Pubkey, u64)> = Vec::new();
        for i in 0..registry.count {
            let idx = i as usize;
            let agent_pubkey = registry.agents[idx];
            let rep = registry.reputations[idx];
            if rep > 0 {
                total_reputation = total_reputation
                    .checked_add(rep)
                    .ok_or(VeritasError::ArithmeticOverflow)?;
                agent_list.push((agent_pubkey, rep));
            }
        }

        agent_list.sort_by(|a, b| b.1.cmp(&a.1));
        let mut selected: Vec<Pubkey> = Vec::new();

        for i in 0..3usize {
            if total_reputation == 0 {
                break;
            }
            let seed_byte = seed[i % 32];
            let threshold = (seed_byte as u64) % total_reputation;
            let mut cumulative: u64 = 0;
            for (wallet, rep) in &agent_list {
                if selected.contains(wallet) {
                    continue;
                }
                cumulative = cumulative
                    .checked_add(*rep)
                    .ok_or(VeritasError::ArithmeticOverflow)?;
                if cumulative >= threshold {
                    selected.push(*wallet);
                    break;
                }
            }
        }

        for (i, pk) in selected.iter().enumerate().take(3) {
            question.committee[i] = *pk;
        }
        question.status = QuestionStatus::CommitPhase;
        msg!("Committee selected: {:?}", question.committee);
        Ok(())
    }

    pub fn select_committee(ctx: Context<SelectCommittee>, client_seed: u8) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::Pending,
            VeritasError::InvalidStatus
        );
        question.status = QuestionStatus::CommitteeSelected;

        let ix = create_request_randomness_ix(
            ephemeral_vrf_sdk::instructions::RequestRandomnessParams {
                payer: ctx.accounts.payer.key(),
                oracle_queue: ctx.accounts.oracle_queue.key(),
                callback_program_id: ID,
                callback_discriminator: instruction::VrfCallback::DISCRIMINATOR.to_vec(),
                caller_seed: [client_seed; 32],
                accounts_metas: Some(vec![
                    SerializableAccountMeta {
                        pubkey: question.key(),
                        is_signer: false,
                        is_writable: true,
                    },
                    SerializableAccountMeta {
                        pubkey: ctx.accounts.agent_registry.key(),
                        is_signer: false,
                        is_writable: false,
                    },
                ]),
                ..Default::default()
            },
        );
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    /// Select committee using VRF through Ephemeral Rollup
    /// This is the correct way to use VRF on devnet - must go through ER
    pub fn select_committee_er(ctx: Context<SelectCommitteeER>, client_seed: u8) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::Pending,
            VeritasError::InvalidStatus
        );
        question.status = QuestionStatus::CommitteeSelected;

        let ix = create_request_randomness_ix(
            ephemeral_vrf_sdk::instructions::RequestRandomnessParams {
                payer: ctx.accounts.payer.key(),
                oracle_queue: ctx.accounts.oracle_queue.key(),
                callback_program_id: ID,
                callback_discriminator: instruction::VrfCallback::DISCRIMINATOR.to_vec(),
                caller_seed: [client_seed; 32],
                accounts_metas: Some(vec![
                    SerializableAccountMeta {
                        pubkey: question.key(),
                        is_signer: false,
                        is_writable: true,
                    },
                    SerializableAccountMeta {
                        pubkey: ctx.accounts.agent_registry.key(),
                        is_signer: false,
                        is_writable: false,
                    },
                ]),
                ..Default::default()
            },
        );
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    pub fn vrf_callback(ctx: Context<VrfCallback>, randomness: [u8; 32]) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::CommitteeSelected,
            VeritasError::InvalidStatus
        );

        let registry = &ctx.accounts.agent_registry;
        require!(registry.count >= 3, VeritasError::NotEnoughAgents);

        let mut total_reputation: u64 = 0;
        let mut agent_list: Vec<(Pubkey, u64)> = Vec::new();
        for i in 0..registry.count {
            let idx = i as usize;
            let agent_pubkey = registry.agents[idx];
            let rep = registry.reputations[idx];
            if rep > 0 {
                total_reputation = total_reputation
                    .checked_add(rep)
                    .ok_or(VeritasError::ArithmeticOverflow)?;
                agent_list.push((agent_pubkey, rep));
            }
        }

        agent_list.sort_by(|a, b| b.1.cmp(&a.1));
        let mut selected: Vec<Pubkey> = Vec::new();

        for i in 0..3usize {
            if total_reputation == 0 {
                break;
            }
            let seed_byte = randomness[i % 32];
            let threshold = (seed_byte as u64) % total_reputation;
            let mut cumulative: u64 = 0;
            for (wallet, rep) in &agent_list {
                if selected.contains(wallet) {
                    continue;
                }
                cumulative = cumulative
                    .checked_add(*rep)
                    .ok_or(VeritasError::ArithmeticOverflow)?;
                if cumulative >= threshold {
                    selected.push(*wallet);
                    break;
                }
            }
        }

        for (i, pk) in selected.iter().enumerate().take(3) {
            question.committee[i] = *pk;
        }
        question.status = QuestionStatus::CommitPhase;
        Ok(())
    }

    pub fn commit_vote(ctx: Context<CommitVote>, commit_hash: [u8; 32]) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::CommitPhase,
            VeritasError::CommitPhaseNotActive
        );
        let is_committee_member = question
            .committee
            .iter()
            .any(|pk| *pk == ctx.accounts.agent_wallet.key());
        require!(is_committee_member, VeritasError::NotCommitteeMember);

        let vote_commit = &mut ctx.accounts.vote_commit;
        vote_commit.question = question.key();
        vote_commit.agent = ctx.accounts.agent_wallet.key();
        vote_commit.round = 1;
        vote_commit.commit_hash = commit_hash;
        vote_commit.committed_at = Clock::get()?.unix_timestamp;
        vote_commit.revealed = false;
        vote_commit.bump = ctx.bumps.vote_commit;
        Ok(())
    }

    pub fn reveal_vote(
        ctx: Context<RevealVote>,
        vote: u8,
        salt: [u8; 16],
        confidence: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        require!(vote <= 2, VeritasError::InvalidVote);
        require!(confidence <= 100, VeritasError::InvalidConfidence);
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::RevealPhase,
            VeritasError::RevealPhaseNotActive
        );

        let vote_commit = &mut ctx.accounts.vote_commit;
        require!(!vote_commit.revealed, VeritasError::AlreadyRevealed);

        let mut hasher = Sha256::new();
        hasher.update(&[vote]);
        hasher.update(&salt);
        hasher.update(&question.question_id.to_le_bytes());
        hasher.update(&[vote_commit.round]);
        let expected_hash: [u8; 32] = hasher.finalize().into();
        require!(
            expected_hash == vote_commit.commit_hash,
            VeritasError::HashMismatch
        );

        let vote_reveal = &mut ctx.accounts.vote_reveal;
        vote_reveal.question = question.key();
        vote_reveal.agent = ctx.accounts.agent_wallet.key();
        vote_reveal.round = vote_commit.round;
        vote_reveal.vote = vote;
        vote_reveal.salt = salt;
        vote_reveal.confidence = confidence;
        vote_reveal.evidence_hash = evidence_hash;
        vote_reveal.reasoning_hash = [0u8; 32];
        vote_reveal.revealed_at = Clock::get()?.unix_timestamp;
        vote_reveal.bump = ctx.bumps.vote_reveal;

        match vote {
            0 => {
                question.yes_votes = question
                    .yes_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            1 => {
                question.no_votes = question
                    .no_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            2 => {
                question.unsure_votes = question
                    .unsure_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            _ => return Err(VeritasError::InvalidVote.into()),
        }

        vote_commit.revealed = true;
        Ok(())
    }

    pub fn resolve_question(ctx: Context<ResolveQuestion>) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::RevealPhase,
            VeritasError::InvalidStatus
        );

        let total_votes = question
            .yes_votes
            .checked_add(question.no_votes)
            .ok_or(VeritasError::ArithmeticOverflow)?
            .checked_add(question.unsure_votes)
            .ok_or(VeritasError::ArithmeticOverflow)?;
        require!(total_votes > 0, VeritasError::NoVotes);

        let threshold = question.consensus_threshold as u64;
        let total_bps = 100u64;

        let yes_pct = (question
            .yes_votes
            .checked_mul(total_bps)
            .ok_or(VeritasError::ArithmeticOverflow)?)
            / total_votes;
        let no_pct = (question
            .no_votes
            .checked_mul(total_bps)
            .ok_or(VeritasError::ArithmeticOverflow)?)
            / total_votes;

        if yes_pct >= threshold {
            question.result = Some(Vote::Yes);
        } else if no_pct >= threshold {
            question.result = Some(Vote::No);
        } else {
            question.result = Some(Vote::Unsure);
        }

        question.status = QuestionStatus::Resolved;
        question.resolved_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_reputation(ctx: Context<UpdateReputation>, delta: i32) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        let _old_rep = agent.reputation;
        if delta >= 0 {
            agent.reputation = agent.reputation.saturating_add(delta as u64);
        } else {
            agent.reputation = agent.reputation.saturating_sub((-delta) as u64);
        }
        if agent.reputation > 1000 {
            agent.reputation = 1000;
        }

        let registry = &mut ctx.accounts.agent_registry;
        for i in 0..registry.count {
            let idx = i as usize;
            if registry.agents[idx] == agent.wallet {
                registry.reputations[idx] = agent.reputation;
                break;
            }
        }

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(question.result.is_some(), VeritasError::QuestionNotResolved);

        let agent = &mut ctx.accounts.agent;
        let is_committee = question.committee.iter().any(|pk| *pk == agent.wallet);
        require!(is_committee, VeritasError::NotCommitteeMember);

        let reward = question
            .query_fee
            .checked_div(3)
            .ok_or(VeritasError::ArithmeticOverflow)?;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? -= reward;
        **ctx.accounts.agent_wallet.try_borrow_mut_lamports()? += reward;
        Ok(())
    }

    pub fn verify_human(
        ctx: Context<VerifyHuman>,
        reclaim_proof_hash: [u8; 32],
        provider_hash: [u8; 32],
    ) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        attestation.wallet = ctx.accounts.wallet.key();
        attestation.reclaim_proof_hash = reclaim_proof_hash;
        attestation.provider_hash = provider_hash;
        attestation.verified_at = Clock::get()?.unix_timestamp;
        attestation.expires_at = Clock::get()?.unix_timestamp + 365 * 24 * 60 * 60;
        attestation.bump = ctx.bumps.attestation;
        Ok(())
    }

    pub fn create_question_permission(
        ctx: Context<CreateQuestionPermission>,
        question_id: u64,
    ) -> Result<()> {
        let question = &ctx.accounts.question;
        require!(
            question.status == QuestionStatus::CommitteeSelected,
            VeritasError::InvalidStatus
        );

        let (_, bump) =
            Pubkey::find_program_address(&[QUESTION_SEED, &question_id.to_le_bytes()], &ID);
        let qid_bytes = question_id.to_le_bytes();
        let bump_bytes = [bump];
        let seeds: Vec<&[u8]> = vec![QUESTION_SEED, &qid_bytes, &bump_bytes];

        let mut members: Vec<Member> = Vec::new();
        for committee_member in question.committee.iter() {
            if *committee_member != Pubkey::default() {
                members.push(Member {
                    flags: 1 | 2,
                    pubkey: *committee_member,
                });
            }
        }

        CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
            .permissioned_account(&ctx.accounts.question.to_account_info())
            .permission(&ctx.accounts.permission)
            .payer(&ctx.accounts.payer)
            .system_program(&ctx.accounts.system_program)
            .args(MembersArgs {
                members: Some(members),
            })
            .invoke_signed(&[&seeds])?;

        Ok(())
    }

    pub fn delegate_question_to_tee(
        ctx: Context<DelegateQuestionToTee>,
        question_id: u64,
    ) -> Result<()> {
        let tee_validator =
            Pubkey::try_from(TEE_VALIDATOR).map_err(|_| VeritasError::InvalidTEEValidator)?;

        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[QUESTION_SEED, &question_id.to_le_bytes()],
            DelegateConfig {
                validator: Some(tee_validator),
                ..Default::default()
            },
        )?;

        Ok(())
    }

    pub fn start_private_voting(ctx: Context<StartPrivateVoting>) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::CommitteeSelected
                || question.status == QuestionStatus::CommitPhase,
            VeritasError::InvalidStatus
        );
        let tee_validator =
            Pubkey::try_from(TEE_VALIDATOR).map_err(|_| VeritasError::InvalidTEEValidator)?;
        question.tee_validator = tee_validator;
        question.is_private = true;
        question.status = QuestionStatus::PrivateVoting;
        Ok(())
    }

    pub fn admin_set_committee(
        ctx: Context<AdminSetCommittee>,
        committee: Vec<Pubkey>,
    ) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(committee.len() <= 3, VeritasError::NotEnoughAgents);
        for (i, pk) in committee.iter().enumerate().take(3) {
            question.committee[i] = *pk;
        }
        if question.status == QuestionStatus::Pending {
            question.status = QuestionStatus::CommitteeSelected;
        }
        Ok(())
    }

    pub fn private_commit_vote(ctx: Context<CommitVote>, commit_hash: [u8; 32]) -> Result<()> {
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::PrivateVoting,
            VeritasError::CommitPhaseNotActive
        );
        let is_committee_member = question
            .committee
            .iter()
            .any(|pk| *pk == ctx.accounts.agent_wallet.key());
        require!(is_committee_member, VeritasError::NotCommitteeMember);

        let vote_commit = &mut ctx.accounts.vote_commit;
        vote_commit.question = question.key();
        vote_commit.agent = ctx.accounts.agent_wallet.key();
        vote_commit.round = 1;
        vote_commit.commit_hash = commit_hash;
        vote_commit.committed_at = Clock::get()?.unix_timestamp;
        vote_commit.revealed = false;
        vote_commit.bump = ctx.bumps.vote_commit;
        Ok(())
    }

    pub fn private_reveal_vote(
        ctx: Context<RevealVote>,
        vote: u8,
        salt: [u8; 16],
        confidence: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        require!(vote <= 2, VeritasError::InvalidVote);
        require!(confidence <= 100, VeritasError::InvalidConfidence);
        let question = &mut ctx.accounts.question;
        require!(
            question.status == QuestionStatus::PrivateVoting
                || question.status == QuestionStatus::RevealPhase,
            VeritasError::RevealPhaseNotActive
        );

        if question.status == QuestionStatus::PrivateVoting {
            question.status = QuestionStatus::RevealPhase;
        }

        let vote_commit = &mut ctx.accounts.vote_commit;
        require!(!vote_commit.revealed, VeritasError::AlreadyRevealed);

        let mut hasher = Sha256::new();
        hasher.update(&[vote]);
        hasher.update(&salt);
        hasher.update(&question.question_id.to_le_bytes());
        hasher.update(&[vote_commit.round]);
        let expected_hash: [u8; 32] = hasher.finalize().into();
        require!(
            expected_hash == vote_commit.commit_hash,
            VeritasError::HashMismatch
        );

        let vote_reveal = &mut ctx.accounts.vote_reveal;
        vote_reveal.question = question.key();
        vote_reveal.agent = ctx.accounts.agent_wallet.key();
        vote_reveal.round = vote_commit.round;
        vote_reveal.vote = vote;
        vote_reveal.salt = salt;
        vote_reveal.confidence = confidence;
        vote_reveal.evidence_hash = evidence_hash;
        vote_reveal.reasoning_hash = [0u8; 32];
        vote_reveal.revealed_at = Clock::get()?.unix_timestamp;
        vote_reveal.bump = ctx.bumps.vote_reveal;

        match vote {
            0 => {
                question.yes_votes = question
                    .yes_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            1 => {
                question.no_votes = question
                    .no_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            2 => {
                question.unsure_votes = question
                    .unsure_votes
                    .checked_add(1)
                    .ok_or(VeritasError::ArithmeticOverflow)?
            }
            _ => return Err(VeritasError::InvalidVote.into()),
        }

        vote_commit.revealed = true;
        Ok(())
    }

    pub fn commit_and_undelegate_private(ctx: Context<CommitAndUndelegateQuestion>) -> Result<()> {
        let question_info = ctx.accounts.question.to_account_info();
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&question_info],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        let question = &mut ctx.accounts.question;
        question.is_private = false;
        question.tee_validator = Pubkey::default();
        Ok(())
    }

    /// Full PER/TEE enablement:
    /// 1. Create permission account for access control
    /// 2. Delegate permission account to TEE validator
    /// 3. Delegate question PDA to TEE validator
    /// 4. Set status to PrivateVoting
    pub fn enable_private_voting(ctx: Context<EnablePrivateVoting>) -> Result<()> {
        let question = &ctx.accounts.question;
        let question_id = question.question_id;

        require!(
            question.status == QuestionStatus::CommitteeSelected
                || question.status == QuestionStatus::CommitPhase,
            VeritasError::InvalidStatus
        );

        let tee_validator =
            Pubkey::try_from(TEE_VALIDATOR).map_err(|_| VeritasError::InvalidTEEValidator)?;

        // Derive seeds for signing
        let qid_bytes = question_id.to_le_bytes();
        let bump = ctx.bumps.question;
        let seeds: &[&[u8]] = &[QUESTION_SEED, &qid_bytes, &[bump]];

        // Build committee members for permission
        let mut members: Vec<Member> = Vec::new();
        for committee_member in question.committee.iter() {
            if *committee_member != Pubkey::default() {
                members.push(Member {
                    flags: 1 | 2, // AUTHORITY_FLAG | TX_LOGS_FLAG
                    pubkey: *committee_member,
                });
            }
        }

        // 1. Create permission account (skip if already exists)
        if ctx.accounts.permission.data_is_empty() {
            CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .permissioned_account(&ctx.accounts.question.to_account_info())
                .permission(&ctx.accounts.permission)
                .payer(&ctx.accounts.payer)
                .system_program(&ctx.accounts.system_program)
                .args(MembersArgs {
                    members: Some(members),
                })
                .invoke_signed(&[seeds])?;
        }

        // 2. Delegate permission account (skip if already delegated)
        if ctx.accounts.permission.owner != &ephemeral_rollups_sdk::id() {
            DelegatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
                .permissioned_account(&ctx.accounts.question.to_account_info(), true)
                .authority(&ctx.accounts.question.to_account_info(), false)
                .permission(&ctx.accounts.permission)
                .payer(&ctx.accounts.payer)
                .system_program(&ctx.accounts.system_program)
                .owner_program(&ctx.accounts.permission_program)
                .delegation_buffer(&ctx.accounts.buffer_permission)
                .delegation_record(&ctx.accounts.record_permission)
                .delegation_metadata(&ctx.accounts.metadata_permission)
                .delegation_program(&ctx.accounts.delegation_program)
                .validator(Some(&ctx.accounts.validator))
                .invoke_signed(&[seeds])?;
        }

        // 3. Update status BEFORE delegating (can't modify after ownership transfer)
        let question_mut = &mut ctx.accounts.question;
        question_mut.tee_validator = tee_validator;
        question_mut.is_private = true;
        question_mut.status = QuestionStatus::PrivateVoting;

        // Force Anchor to serialize account data NOW before ownership transfer
        question_mut.exit(&crate::ID)?;

        // 4. Delegate question PDA (skip if already delegated)
        if ctx.accounts.question.to_account_info().owner != &ephemeral_rollups_sdk::id() {
            let del_accounts = ephemeral_rollups_sdk::cpi::DelegateAccounts {
                payer: &ctx.accounts.payer,
                pda: &ctx.accounts.question.to_account_info(),
                owner_program: &ctx.accounts.owner_program,
                buffer: &ctx.accounts.buffer_question,
                delegation_record: &ctx.accounts.record_question,
                delegation_metadata: &ctx.accounts.metadata_question,
                delegation_program: &ctx.accounts.delegation_program,
                system_program: &ctx.accounts.system_program,
            };
            ephemeral_rollups_sdk::cpi::delegate_account(
                del_accounts,
                &[QUESTION_SEED, &qid_bytes],
                DelegateConfig {
                    validator: Some(tee_validator),
                    ..Default::default()
                },
            )?;
        }

        Ok(())
    }
}
