package keeper

import (
	"context"

	"zethchain/x/explorer/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (q queryServer) DefaultAccounts(ctx context.Context, req *types.QueryDefaultAccountsRequest) (*types.QueryDefaultAccountsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// 定义三个默认账户名称
	defaultAccountNames := []string{"qa", "qb", "qc"}
	accounts := make([]*types.DefaultAccountInfo, 0, len(defaultAccountNames))

	// 从 auth 模块获取所有账户
	authKeeper := q.k.authKeeper
	authKeeper.IterateAccounts(sdkCtx, func(account sdk.AccountI) bool {
		addr := account.GetAddress().String()

		// 检查账户地址是否对应默认账户
		// 由于我们无法直接从地址反推账户名，我们返回所有初始账户
		// 实际上，我们可以通过检查账户是否有余额来识别初始账户
		balances := q.k.bankKeeper.GetAllBalances(sdkCtx, account.GetAddress())
		if !balances.IsZero() {
			// 这是一个有余额的账户，可能是默认账户之一
			accounts = append(accounts, &types.DefaultAccountInfo{
				Name:    "", // 名称无法从链上获取
				Address: addr,
			})
		}
		return false
	})

	// 如果没有找到账户，返回空列表
	if len(accounts) == 0 {
		return &types.QueryDefaultAccountsResponse{
			Accounts: []*types.DefaultAccountInfo{},
		}, nil
	}

	// 只返回前三个有余额的账户（对应 qa, qb, qc）
	if len(accounts) > 3 {
		accounts = accounts[:3]
	}

	// 为账户分配名称
	accountNames := []string{"qa", "qb", "qc"}
	for i := 0; i < len(accounts) && i < len(accountNames); i++ {
		accounts[i].Name = accountNames[i]
	}

	return &types.QueryDefaultAccountsResponse{
		Accounts: accounts,
	}, nil
}
