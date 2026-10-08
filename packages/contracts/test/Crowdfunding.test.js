import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Crowdfunding", function () {
    let crowdfunding;
    let creator;
    let contributor;
    let contributor2;
    let other;

    beforeEach(async function () {
        [creator, contributor, contributor2, other] =
            await ethers.getSigners();

        const Crowdfunding = await ethers.getContractFactory(
            "Crowdfunding"
        );

        crowdfunding = await Crowdfunding.deploy();

        await crowdfunding.waitForDeployment();
    });

    async function createCampaign(
        goal = ethers.parseEther("5"),
        duration = 3600
    ) {
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadline = latestBlock.timestamp + duration;

        const tx = await crowdfunding
            .connect(creator)
            .createCampaign(
                "Help Build a School",
                "FundChain community campaign",
                goal,
                deadline
            );

        await tx.wait();

        return 0;
    }

    async function increaseTime(seconds) {
        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine");
    }

    // =============================================================
    //                     DEPLOYMENT
    // =============================================================

    describe("Deployment", function () {
        it("starts with zero campaigns", async function () {
            expect(await crowdfunding.campaignCount()).to.equal(0);
        });
    });

    // =============================================================
    //                  CAMPAIGN CREATION
    // =============================================================

    describe("Campaign Creation", function () {
        it("creates a campaign", async function () {
            const campaignId = await createCampaign();

            const campaign = await crowdfunding.getCampaign(campaignId);

            expect(campaign.creator).to.equal(creator.address);
            expect(campaign.title).to.equal("Help Build a School");
            expect(campaign.description).to.equal(
                "FundChain community campaign"
            );
            expect(campaign.goal).to.equal(
                ethers.parseEther("5")
            );
            expect(campaign.raised).to.equal(0);
            expect(campaign.withdrawn).to.equal(false);
        });

        it("increments campaign count", async function () {
            await createCampaign();

            expect(await crowdfunding.campaignCount()).to.equal(1);
        });

        it("emits CampaignCreated", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadline = latestBlock.timestamp + 3600;

            await expect(
                crowdfunding.createCampaign(
                    "Test Campaign",
                    "Test Description",
                    ethers.parseEther("2"),
                    deadline
                )
            )
                .to.emit(crowdfunding, "CampaignCreated")
                .withArgs(
                    0,
                    creator.address,
                    "Test Campaign",
                    ethers.parseEther("2"),
                    deadline
                );
        });

        it("rejects zero goal", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadline = latestBlock.timestamp + 3600;

            await expect(
                crowdfunding.createCampaign(
                    "Invalid",
                    "Invalid",
                    0,
                    deadline
                )
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "InvalidGoal"
            );
        });

        it("rejects past deadline", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");

            await expect(
                crowdfunding.createCampaign(
                    "Invalid",
                    "Invalid",
                    ethers.parseEther("1"),
                    latestBlock.timestamp
                )
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "InvalidDeadline"
            );
        });
    });

    // =============================================================
    //                     CONTRIBUTIONS
    // =============================================================

    describe("Contributions", function () {
        beforeEach(async function () {
            await createCampaign();
        });

        it("accepts ETH contribution", async function () {
            const amount = ethers.parseEther("1");

            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: amount,
                });

            const campaign = await crowdfunding.getCampaign(0);

            expect(campaign.raised).to.equal(amount);

            expect(
                await crowdfunding.getContribution(
                    0,
                    contributor.address
                )
            ).to.equal(amount);
        });

        it("emits ContributionReceived", async function () {
            const amount = ethers.parseEther("1");

            await expect(
                crowdfunding.connect(contributor).contribute(0, {
                    value: amount,
                })
            )
                .to.emit(crowdfunding, "ContributionReceived")
                .withArgs(
                    0,
                    contributor.address,
                    amount
                );
        });

        it("supports multiple contributors", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("1"),
                });

            await crowdfunding
                .connect(contributor2)
                .contribute(0, {
                    value: ethers.parseEther("2"),
                });

            const campaign = await crowdfunding.getCampaign(0);

            expect(campaign.raised).to.equal(
                ethers.parseEther("3")
            );
        });

        it("rejects zero contribution", async function () {
            await expect(
                crowdfunding.connect(contributor).contribute(0, {
                    value: 0,
                })
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "ZeroContribution"
            );
        });

        it("rejects contribution to unknown campaign", async function () {
            await expect(
                crowdfunding.connect(contributor).contribute(999, {
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "CampaignNotFound"
            );
        });

        it("rejects contribution after deadline", async function () {
            await increaseTime(3601);

            await expect(
                crowdfunding.connect(contributor).contribute(0, {
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "CampaignEnded"
            );
        });

        it("rejects contribution after goal is reached", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("5"),
                });

            await expect(
                crowdfunding.connect(contributor2).contribute(0, {
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "GoalReached"
            );
        });
    });

    // =============================================================
    //                         WITHDRAWAL
    // =============================================================

    describe("Withdrawal", function () {
        beforeEach(async function () {
            await createCampaign();
        });

        it("allows creator to withdraw after reaching goal", async function () {
            const amount = ethers.parseEther("5");

            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: amount,
                });

            const creatorBalanceBefore =
                await ethers.provider.getBalance(
                    creator.address
                );

            const tx = await crowdfunding
                .connect(creator)
                .withdraw(0);

            const receipt = await tx.wait();

            const creatorBalanceAfter =
                await ethers.provider.getBalance(
                    creator.address
                );

            const gasCost =
                receipt.gasUsed * receipt.gasPrice;

            expect(
                creatorBalanceAfter + gasCost
            ).to.equal(
                creatorBalanceBefore + amount
            );
        });

        it("marks campaign as withdrawn", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("5"),
                });

            await crowdfunding
                .connect(creator)
                .withdraw(0);

            const campaign =
                await crowdfunding.getCampaign(0);

            expect(campaign.withdrawn).to.equal(true);
        });

        it("emits CampaignWithdrawn", async function () {
            const amount = ethers.parseEther("5");

            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: amount,
                });

            await expect(
                crowdfunding
                    .connect(creator)
                    .withdraw(0)
            )
                .to.emit(crowdfunding, "CampaignWithdrawn")
                .withArgs(
                    0,
                    creator.address,
                    amount
                );
        });

        it("rejects withdrawal before goal is reached", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("1"),
                });

            await expect(
                crowdfunding
                    .connect(creator)
                    .withdraw(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "GoalNotReached"
            );
        });

        it("rejects withdrawal from non-creator", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("5"),
                });

            await expect(
                crowdfunding
                    .connect(other)
                    .withdraw(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "NotCampaignCreator"
            );
        });

        it("prevents double withdrawal", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("5"),
                });

            await crowdfunding
                .connect(creator)
                .withdraw(0);

            await expect(
                crowdfunding
                    .connect(creator)
                    .withdraw(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "AlreadyWithdrawn"
            );
        });
    });

    // =============================================================
    //                           REFUNDS
    // =============================================================

    describe("Refunds", function () {
        beforeEach(async function () {
            await createCampaign(
                ethers.parseEther("10"),
                3600
            );
        });

        it("allows contributor to refund after failed campaign", async function () {
            const amount = ethers.parseEther("2");

            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: amount,
                });

            await increaseTime(3601);

            const balanceBefore =
                await ethers.provider.getBalance(
                    contributor.address
                );

            const tx = await crowdfunding
                .connect(contributor)
                .refund(0);

            const receipt = await tx.wait();

            const balanceAfter =
                await ethers.provider.getBalance(
                    contributor.address
                );

            const gasCost =
                receipt.gasUsed * receipt.gasPrice;

            expect(
                balanceAfter + gasCost
            ).to.equal(
                balanceBefore + amount
            );
        });

        it("marks refund as completed", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("2"),
                });

            await increaseTime(3601);

            await crowdfunding
                .connect(contributor)
                .refund(0);

            expect(
                await crowdfunding.refunded(
                    0,
                    contributor.address
                )
            ).to.equal(true);
        });

        it("emits RefundIssued", async function () {
            const amount = ethers.parseEther("2");

            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: amount,
                });

            await increaseTime(3601);

            await expect(
                crowdfunding
                    .connect(contributor)
                    .refund(0)
            )
                .to.emit(crowdfunding, "RefundIssued")
                .withArgs(
                    0,
                    contributor.address,
                    amount
                );
        });

        it("rejects refund before deadline", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("2"),
                });

            await expect(
                crowdfunding
                    .connect(contributor)
                    .refund(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "NotFailed"
            );
        });

        it("rejects refund when goal was reached", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("10"),
                });

            await increaseTime(3601);

            await expect(
                crowdfunding
                    .connect(contributor)
                    .refund(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "GoalReached"
            );
        });

        it("rejects double refund", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("2"),
                });

            await increaseTime(3601);

            await crowdfunding
                .connect(contributor)
                .refund(0);

            await expect(
                crowdfunding
                    .connect(contributor)
                    .refund(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "AlreadyRefunded"
            );
        });

        it("rejects refund for non-contributor", async function () {
            await increaseTime(3601);

            await expect(
                crowdfunding
                    .connect(other)
                    .refund(0)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "NothingToRefund"
            );
        });
    });

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    describe("View Functions", function () {
        beforeEach(async function () {
            await createCampaign(
                ethers.parseEther("10"),
                3600
            );
        });

        it("reports successful campaign", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("10"),
                });

            expect(
                await crowdfunding.isSuccessful(0)
            ).to.equal(true);
        });

        it("reports failed campaign", async function () {
            await increaseTime(3601);

            expect(
                await crowdfunding.isFailed(0)
            ).to.equal(true);
        });

        it("calculates remaining amount", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("3"),
                });

            expect(
                await crowdfunding.getRemainingAmount(0)
            ).to.equal(ethers.parseEther("7"));
        });

        it("returns zero remaining after goal", async function () {
            await crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("10"),
                });

            expect(
                await crowdfunding.getRemainingAmount(0)
            ).to.equal(0);
        });

        it("rejects unknown campaign in getCampaign", async function () {
            await expect(
                crowdfunding.getCampaign(999)
            ).to.be.revertedWithCustomError(
                crowdfunding,
                "CampaignNotFound"
            );
        });
    });

    describe("Security and Edge Cases", function () {
    beforeEach(async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadline = latestBlock.timestamp + 3600;

        await crowdfunding
            .connect(creator)
            .createCampaign(
                "Security Test Campaign",
                "FundChain security test",
                ethers.parseEther("10"),
                deadline
            );
    });

    it("contract balance equals total contributions", async function () {
        const amount1 = ethers.parseEther("2");
        const amount2 = ethers.parseEther("3");

        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: amount1,
            });

        await crowdfunding
            .connect(contributor2)
            .contribute(0, {
                value: amount2,
            });

        expect(
            await ethers.provider.getBalance(
                await crowdfunding.getAddress()
            )
        ).to.equal(amount1 + amount2);
    });

    it("failed campaign keeps contributor funds inside contract until refund", async function () {
        const amount = ethers.parseEther("2");

        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: amount,
            });

        expect(
            await ethers.provider.getBalance(
                await crowdfunding.getAddress()
            )
        ).to.equal(amount);

        await increaseTime(3601);

        await crowdfunding
            .connect(contributor)
            .refund(0);

        expect(
            await ethers.provider.getBalance(
                await crowdfunding.getAddress()
            )
        ).to.equal(0);
    });

    it("cannot withdraw from a failed campaign", async function () {
        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: ethers.parseEther("5"),
            });

        await increaseTime(3601);

        await expect(
            crowdfunding
                .connect(creator)
                .withdraw(0)
        ).to.be.revertedWithCustomError(
            crowdfunding,
            "GoalNotReached"
        );
    });

    it("cannot refund a successful campaign", async function () {
        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: ethers.parseEther("10"),
            });

        await increaseTime(3601);

        await expect(
            crowdfunding
                .connect(contributor)
                .refund(0)
        ).to.be.revertedWithCustomError(
            crowdfunding,
            "GoalReached"
        );
    });

    it("prevents contribution exactly at the deadline", async function () {
        await increaseTime(3600);

        await expect(
            crowdfunding
                .connect(contributor)
                .contribute(0, {
                    value: ethers.parseEther("1"),
                })
        ).to.be.revertedWithCustomError(
            crowdfunding,
            "CampaignEnded"
        );
    });

    it("prevents withdrawal from unknown campaign", async function () {
        await expect(
            crowdfunding
                .connect(creator)
                .withdraw(999)
        ).to.be.revertedWithCustomError(
            crowdfunding,
            "CampaignNotFound"
        );
    });

    it("prevents refund from unknown campaign", async function () {
        await expect(
            crowdfunding
                .connect(contributor)
                .refund(999)
        ).to.be.revertedWithCustomError(
            crowdfunding,
            "CampaignNotFound"
        );
    });

    it("tracks each contributor independently", async function () {
        const amount1 = ethers.parseEther("2");
        const amount2 = ethers.parseEther("3");

        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: amount1,
            });

        await crowdfunding
            .connect(contributor2)
            .contribute(0, {
                value: amount2,
            });

        expect(
            await crowdfunding.getContribution(
                0,
                contributor.address
            )
        ).to.equal(amount1);

        expect(
            await crowdfunding.getContribution(
                0,
                contributor2.address
            )
        ).to.equal(amount2);
    });

    it("reports campaign as neither successful nor failed while active", async function () {
        expect(
            await crowdfunding.isSuccessful(0)
        ).to.equal(false);

        expect(
            await crowdfunding.isFailed(0)
        ).to.equal(false);
    });

    it("allows contributions from multiple addresses without mixing balances", async function () {
        await crowdfunding
            .connect(contributor)
            .contribute(0, {
                value: ethers.parseEther("1"),
            });

        await crowdfunding
            .connect(contributor2)
            .contribute(0, {
                value: ethers.parseEther("4"),
            });

        const contributorAmount =
            await crowdfunding.getContribution(
                0,
                contributor.address
            );

        const contributor2Amount =
            await crowdfunding.getContribution(
                0,
                contributor2.address
            );

        expect(contributorAmount).to.equal(
            ethers.parseEther("1")
        );

        expect(contributor2Amount).to.equal(
            ethers.parseEther("4")
        );
    });

});

});
