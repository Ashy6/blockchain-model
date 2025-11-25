package keeper

import (
	"context"

	"zethchain/x/mining/types"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k msgServer) Mine(ctx context.Context, msg *types.MsgMine) (*types.MsgMineResponse, error) {
	// Validate miner address
	minerAddr, err := k.addressCodec.StringToBytes(msg.Miner)
	if err != nil {
		return nil, errorsmod.Wrap(err, "invalid miner address")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Define mining reward: 100 ZETH = 100000000 uzeth (1 ZETH = 1000000 uzeth)
	miningReward := sdk.NewCoins(sdk.NewInt64Coin("uzeth", 100000000))
	rewardAmount := uint64(100000000) // uzeth

	// Mint coins to the mining module
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, miningReward); err != nil {
		return nil, errorsmod.Wrap(err, "failed to mint mining reward")
	}

	// Send minted coins from module to miner
	if err := k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, minerAddr, miningReward); err != nil {
		return nil, errorsmod.Wrap(err, "failed to send mining reward")
	}

	// Update mining record
	k.Keeper.UpdateMiningRecord(sdkCtx, msg.Miner, rewardAmount)

	return &types.MsgMineResponse{
		Reward: miningReward.String(),
	}, nil
}
