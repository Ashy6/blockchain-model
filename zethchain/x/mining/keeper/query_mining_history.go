package keeper

import (
	"context"
	"fmt"
	"strconv"

	"zethchain/x/mining/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// MiningHistory implements the Query/MiningHistory gRPC method
func (q queryServer) MiningHistory(ctx context.Context, req *types.QueryMiningHistoryRequest) (*types.QueryMiningHistoryResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	if req.Address == "" {
		return nil, status.Error(codes.InvalidArgument, "address cannot be empty")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// 获取挖矿记录
	miningRecord, found := q.k.GetMiningRecord(sdkCtx, req.Address)

	// 如果没有挖矿记录，返回默认值
	if !found {
		return &types.QueryMiningHistoryResponse{
			LastMineTime: "0",
			TotalMined:   "0",
			MineCount:    "0",
		}, nil
	}

	// 返回挖矿历史
	return &types.QueryMiningHistoryResponse{
		LastMineTime: strconv.FormatInt(miningRecord.LastMineTime, 10),
		TotalMined:   fmt.Sprintf("%d", miningRecord.TotalMined),
		MineCount:    strconv.FormatUint(miningRecord.MineCount, 10),
	}, nil
}
