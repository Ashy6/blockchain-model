package keeper

import (
	"context"

	"zethchain/x/explorer/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) ChainStats(ctx context.Context, req *types.QueryChainStatsRequest) (*types.QueryChainStatsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)
	blockHeight := uint64(sdkCtx.BlockHeight())

	// 固定总供应量为 21000 ZETH (21000000000 uzeth)
	// 这是创世区块中配置的总量
	totalSupply := "21000000000"

	// 固定验证者数量为 1
	validatorCount := uint64(1)

	return &types.QueryChainStatsResponse{
		BlockHeight:    blockHeight,
		TotalSupply:    totalSupply,
		ValidatorCount: validatorCount,
	}, nil
}
