package keeper

import (
	"context"
	"fmt"

	"zethchain/x/explorer/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) LatestBlocks(ctx context.Context, req *types.QueryLatestBlocksRequest) (*types.QueryLatestBlocksResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// 确定要查询的数量（默认 10 个）
	limit := req.Limit
	if limit == 0 || limit > 100 {
		limit = 10
	}

	// 获取当前高度
	currentHeight := sdkCtx.BlockHeight()

	// 构造区块列表（简化版 - 只返回高度列表）
	result := ""
	for i := int64(0); i < int64(limit); i++ {
		height := currentHeight - i
		if height < 1 {
			break
		}

		if i > 0 {
			result += ","
		}
		result += fmt.Sprintf("%d", height)
	}

	return &types.QueryLatestBlocksResponse{
		Blocks: result,
	}, nil
}
