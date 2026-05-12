/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/veritas_oracle.json`.
 */
export type VeritasOracle = {
  "address": "6RE3cPuSF3XVEgLkULMpZi8vaPLdvfhQuB5esLFAQPbf",
  "metadata": {
    "name": "veritasOracle",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "VERITAS Private Oracle Intelligence - Autonomous AI oracle with commit-reveal voting"
  },
  "instructions": [
    {
      "name": "adminSetCommittee",
      "discriminator": [
        126,
        165,
        65,
        196,
        42,
        114,
        113,
        137
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "committee",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "claimReward",
      "discriminator": [
        149,
        95,
        181,
        242,
        94,
        90,
        158,
        162
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "agentWallet",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "commitAndUndelegateAgent",
      "discriminator": [
        246,
        13,
        172,
        175,
        30,
        184,
        205,
        189
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "magicContext"
        },
        {
          "name": "magicProgram"
        }
      ],
      "args": []
    },
    {
      "name": "commitAndUndelegatePrivate",
      "discriminator": [
        215,
        215,
        187,
        210,
        188,
        252,
        124,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "magicContext"
        },
        {
          "name": "magicProgram"
        }
      ],
      "args": []
    },
    {
      "name": "commitAndUndelegateQuestion",
      "discriminator": [
        175,
        172,
        110,
        91,
        49,
        228,
        5,
        245
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "magicContext"
        },
        {
          "name": "magicProgram"
        }
      ],
      "args": []
    },
    {
      "name": "commitVote",
      "discriminator": [
        134,
        97,
        90,
        126,
        91,
        66,
        16,
        26
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "voteCommit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  99,
                  111,
                  109,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "question"
              },
              {
                "kind": "account",
                "path": "agentWallet"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createQuestionPermission",
      "discriminator": [
        161,
        201,
        41,
        98,
        47,
        6,
        166,
        95
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "questionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateAgent",
      "discriminator": [
        32,
        179,
        196,
        108,
        101,
        41,
        23,
        100
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                233,
                115,
                248,
                242,
                74,
                252,
                4,
                118,
                100,
                38,
                228,
                71,
                30,
                249,
                2,
                141,
                214,
                122,
                131,
                187,
                190,
                54,
                70,
                215,
                216,
                112,
                65,
                97,
                98,
                138,
                116,
                55
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "GiJZVWSzASNJoZXJK4SSe3F59sPv8qVHnyvZAqDgyUFG"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "delegateQuestion",
      "discriminator": [
        35,
        5,
        69,
        227,
        109,
        26,
        24,
        223
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                233,
                115,
                248,
                242,
                74,
                252,
                4,
                118,
                100,
                38,
                228,
                71,
                30,
                249,
                2,
                141,
                214,
                122,
                131,
                187,
                190,
                54,
                70,
                215,
                216,
                112,
                65,
                97,
                98,
                138,
                116,
                55
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true
        },
        {
          "name": "ownerProgram",
          "address": "GiJZVWSzASNJoZXJK4SSe3F59sPv8qVHnyvZAqDgyUFG"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "questionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delegateQuestionToTee",
      "discriminator": [
        233,
        138,
        217,
        25,
        157,
        119,
        3,
        51
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "bufferPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                233,
                115,
                248,
                242,
                74,
                252,
                4,
                118,
                100,
                38,
                228,
                71,
                30,
                249,
                2,
                141,
                214,
                122,
                131,
                187,
                190,
                54,
                70,
                215,
                216,
                112,
                65,
                97,
                98,
                138,
                116,
                55
              ]
            }
          }
        },
        {
          "name": "delegationRecordPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "pda"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "pda",
          "writable": true
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "GiJZVWSzASNJoZXJK4SSe3F59sPv8qVHnyvZAqDgyUFG"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "questionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "enablePrivateVoting",
      "docs": [
        "Full PER/TEE enablement:",
        "1. Create permission account for access control",
        "2. Delegate permission account to TEE validator",
        "3. Delegate question PDA to TEE validator",
        "4. Set status to PrivateVoting"
      ],
      "discriminator": [
        182,
        220,
        230,
        130,
        58,
        168,
        243,
        100
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "ownerProgram",
          "address": "GiJZVWSzASNJoZXJK4SSe3F59sPv8qVHnyvZAqDgyUFG"
        },
        {
          "name": "question",
          "docs": [
            "The question PDA to delegate to TEE"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "question.question_id",
                "account": "question"
              }
            ]
          }
        },
        {
          "name": "bufferQuestion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "question"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                233,
                115,
                248,
                242,
                74,
                252,
                4,
                118,
                100,
                38,
                228,
                71,
                30,
                249,
                2,
                141,
                214,
                122,
                131,
                187,
                190,
                54,
                70,
                215,
                216,
                112,
                65,
                97,
                98,
                138,
                116,
                55
              ]
            }
          }
        },
        {
          "name": "recordQuestion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "question"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "metadataQuestion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "question"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "question"
              }
            ],
            "program": {
              "kind": "account",
              "path": "permissionProgram"
            }
          }
        },
        {
          "name": "bufferPermission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "permission"
              }
            ],
            "program": {
              "kind": "account",
              "path": "permissionProgram"
            }
          }
        },
        {
          "name": "recordPermission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "permission"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "metadataPermission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "permission"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "validator"
        }
      ],
      "args": []
    },
    {
      "name": "initAgentRegistry",
      "discriminator": [
        224,
        197,
        4,
        16,
        120,
        120,
        206,
        126
      ],
      "accounts": [
        {
          "name": "agentRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "privateCommitVote",
      "discriminator": [
        233,
        13,
        167,
        52,
        73,
        41,
        212,
        192
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "voteCommit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  99,
                  111,
                  109,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "question"
              },
              {
                "kind": "account",
                "path": "agentWallet"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "privateRevealVote",
      "discriminator": [
        174,
        195,
        28,
        234,
        226,
        57,
        108,
        4
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "voteCommit",
          "writable": true
        },
        {
          "name": "voteReveal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  118,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "question"
              },
              {
                "kind": "account",
                "path": "agentWallet"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vote",
          "type": "u8"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "confidence",
          "type": "u8"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "agentRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "personalityHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "resolveQuestion",
      "discriminator": [
        52,
        32,
        224,
        179,
        180,
        8,
        0,
        246
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "revealVote",
      "discriminator": [
        100,
        157,
        139,
        17,
        186,
        75,
        185,
        149
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "voteCommit",
          "writable": true
        },
        {
          "name": "voteReveal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  118,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "question"
              },
              {
                "kind": "account",
                "path": "agentWallet"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vote",
          "type": "u8"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "confidence",
          "type": "u8"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "selectCommittee",
      "discriminator": [
        215,
        88,
        75,
        15,
        207,
        3,
        104,
        69
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"
        },
        {
          "name": "agentRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "selectCommitteeEr",
      "docs": [
        "Select committee using VRF through Ephemeral Rollup",
        "This is the correct way to use VRF on devnet - must go through ER"
      ],
      "discriminator": [
        158,
        222,
        153,
        148,
        230,
        86,
        66,
        120
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc"
        },
        {
          "name": "agentRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "selectCommitteeSimple",
      "docs": [
        "Select committee using on-chain pseudo-randomness (slot hashes)",
        "This is a pragmatic fallback when VRF is unavailable on devnet"
      ],
      "discriminator": [
        215,
        88,
        75,
        15,
        207,
        3,
        104,
        69
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "agentRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "startPrivateVoting",
      "discriminator": [
        160,
        157,
        55,
        59,
        181,
        132,
        16,
        241
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "submitQuestion",
      "discriminator": [
        92,
        188,
        40,
        135,
        83,
        241,
        178,
        40
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  113,
                  117,
                  101,
                  115,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "config.question_counter",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "asker",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "questionText",
          "type": "string"
        },
        {
          "name": "category",
          "type": "string"
        },
        {
          "name": "deadline",
          "type": "i64"
        }
      ]
    },
    {
      "name": "updateQuestionStatus",
      "discriminator": [
        237,
        171,
        179,
        4,
        161,
        20,
        61,
        18
      ],
      "accounts": [
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newStatus",
          "type": {
            "defined": {
              "name": "questionStatus"
            }
          }
        }
      ]
    },
    {
      "name": "updateReputation",
      "discriminator": [
        194,
        220,
        43,
        201,
        54,
        209,
        49,
        178
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "agentRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "delta",
          "type": "i32"
        }
      ]
    },
    {
      "name": "verifyHuman",
      "discriminator": [
        253,
        169,
        52,
        210,
        3,
        111,
        154,
        219
      ],
      "accounts": [
        {
          "name": "attestation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  117,
                  109,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "reclaimProofHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "providerHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "vrfCallback",
      "discriminator": [
        248,
        224,
        55,
        227,
        56,
        10,
        108,
        36
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "signer": true,
          "address": "9irBy75QS2BN81FUgXuHcjqceJJRuc9oDkAe8TKVvvAw"
        },
        {
          "name": "question",
          "writable": true
        },
        {
          "name": "agentRegistry"
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agent",
      "discriminator": [
        47,
        166,
        112,
        147,
        155,
        197,
        86,
        7
      ]
    },
    {
      "name": "agentRegistry",
      "discriminator": [
        6,
        34,
        128,
        124,
        33,
        136,
        199,
        171
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "humanAttestation",
      "discriminator": [
        211,
        171,
        68,
        164,
        35,
        78,
        18,
        177
      ]
    },
    {
      "name": "question",
      "discriminator": [
        111,
        22,
        150,
        220,
        181,
        122,
        118,
        127
      ]
    },
    {
      "name": "voteCommit",
      "discriminator": [
        125,
        216,
        109,
        1,
        40,
        87,
        250,
        47
      ]
    },
    {
      "name": "voteReveal",
      "discriminator": [
        98,
        48,
        252,
        227,
        123,
        6,
        232,
        84
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "questionNotFound",
      "msg": "Question not found"
    },
    {
      "code": 6001,
      "name": "agentNotFound",
      "msg": "Agent not found"
    },
    {
      "code": 6002,
      "name": "notCommitteeMember",
      "msg": "Only committee members can perform this action"
    },
    {
      "code": 6003,
      "name": "commitPhaseNotActive",
      "msg": "Commit phase is not active"
    },
    {
      "code": 6004,
      "name": "revealPhaseNotActive",
      "msg": "Reveal phase is not active"
    },
    {
      "code": 6005,
      "name": "hashMismatch",
      "msg": "Commit hash does not match revealed vote"
    },
    {
      "code": 6006,
      "name": "alreadyRevealed",
      "msg": "Agent has already revealed their vote"
    },
    {
      "code": 6007,
      "name": "consensusNotReached",
      "msg": "Consensus was not reached"
    },
    {
      "code": 6008,
      "name": "questionAlreadyResolved",
      "msg": "Question is already resolved"
    },
    {
      "code": 6009,
      "name": "insufficientReputation",
      "msg": "Insufficient reputation"
    },
    {
      "code": 6010,
      "name": "agentNotActive",
      "msg": "Agent is not active"
    },
    {
      "code": 6011,
      "name": "invalidStatus",
      "msg": "Invalid status for this operation"
    },
    {
      "code": 6012,
      "name": "invalidStatusTransition",
      "msg": "Invalid status transition"
    },
    {
      "code": 6013,
      "name": "questionTooLong",
      "msg": "Question text is too long (max 256 characters)"
    },
    {
      "code": 6014,
      "name": "nameTooLong",
      "msg": "Name is too long (max 32 characters)"
    },
    {
      "code": 6015,
      "name": "categoryTooLong",
      "msg": "Category is too long (max 32 characters)"
    },
    {
      "code": 6016,
      "name": "deadlineInPast",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6017,
      "name": "invalidVote",
      "msg": "Invalid vote value (must be 0=YES, 1=NO, 2=UNSURE)"
    },
    {
      "code": 6018,
      "name": "invalidConfidence",
      "msg": "Confidence must be between 0 and 100"
    },
    {
      "code": 6019,
      "name": "noVotes",
      "msg": "No votes have been cast"
    },
    {
      "code": 6020,
      "name": "questionNotResolved",
      "msg": "Question has not been resolved"
    },
    {
      "code": 6021,
      "name": "notEnoughAgents",
      "msg": "Not enough agents for committee selection"
    },
    {
      "code": 6022,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6023,
      "name": "humanVerificationRequired",
      "msg": "Human verification required"
    },
    {
      "code": 6024,
      "name": "attestationAlreadyExists",
      "msg": "Attestation already exists for this wallet"
    },
    {
      "code": 6025,
      "name": "alreadyCommitted",
      "msg": "Agent has already committed a vote"
    },
    {
      "code": 6026,
      "name": "invalidTeeValidator",
      "msg": "Invalid TEE validator address"
    },
    {
      "code": 6027,
      "name": "permissionFailed",
      "msg": "Permission creation failed"
    }
  ],
  "types": [
    {
      "name": "agent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "personalityHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reputation",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "correctVotes",
            "type": "u64"
          },
          {
            "name": "metaplexNft",
            "type": "pubkey"
          },
          {
            "name": "sasAttestation",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agents",
            "type": {
              "array": [
                "pubkey",
                20
              ]
            }
          },
          {
            "name": "reputations",
            "type": {
              "array": [
                "u64",
                20
              ]
            }
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "defaultQueryFee",
            "type": "u64"
          },
          {
            "name": "committeeSize",
            "type": "u8"
          },
          {
            "name": "consensusThreshold",
            "type": "u8"
          },
          {
            "name": "agentBondAmount",
            "type": "u64"
          },
          {
            "name": "correctReward",
            "type": "u64"
          },
          {
            "name": "wrongPenalty",
            "type": "u64"
          },
          {
            "name": "vrfQueue",
            "type": "pubkey"
          },
          {
            "name": "questionCounter",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "humanAttestation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "reclaimProofHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "providerHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "verifiedAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "question",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "questionText",
            "type": "string"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "queryFee",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "questionStatus"
              }
            }
          },
          {
            "name": "committee",
            "type": {
              "array": [
                "pubkey",
                3
              ]
            }
          },
          {
            "name": "yesVotes",
            "type": "u64"
          },
          {
            "name": "noVotes",
            "type": "u64"
          },
          {
            "name": "unsureVotes",
            "type": "u64"
          },
          {
            "name": "result",
            "type": {
              "option": {
                "defined": {
                  "name": "vote"
                }
              }
            }
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "encryptedResult",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "resolvedAt",
            "type": "i64"
          },
          {
            "name": "questionId",
            "type": "u64"
          },
          {
            "name": "consensusThreshold",
            "type": "u8"
          },
          {
            "name": "teeValidator",
            "type": "pubkey"
          },
          {
            "name": "isPrivate",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "questionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "committeeSelected"
          },
          {
            "name": "commitPhase"
          },
          {
            "name": "revealPhase"
          },
          {
            "name": "discussionPhase"
          },
          {
            "name": "resolved"
          },
          {
            "name": "privateVoting"
          }
        ]
      }
    },
    {
      "name": "vote",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "yes"
          },
          {
            "name": "no"
          },
          {
            "name": "unsure"
          }
        ]
      }
    },
    {
      "name": "voteCommit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "question",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "round",
            "type": "u8"
          },
          {
            "name": "commitHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "committedAt",
            "type": "i64"
          },
          {
            "name": "revealed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteReveal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "question",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "round",
            "type": "u8"
          },
          {
            "name": "vote",
            "type": "u8"
          },
          {
            "name": "salt",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reasoningHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "revealedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
