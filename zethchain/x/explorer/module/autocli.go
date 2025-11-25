package explorer

import (
	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

	"zethchain/x/explorer/types"
)

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
	return &autocliv1.ModuleOptions{
		Query: &autocliv1.ServiceCommandDescriptor{
			Service: types.Query_serviceDesc.ServiceName,
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "Params",
					Use:       "params",
					Short:     "Shows the parameters of the module",
				},
				{
					RpcMethod: "ChainStats",
					Use:       "chain-stats",
					Short:     "Query ChainStats",
				},

				{
					RpcMethod:      "BlockInfo",
					Use:            "block-info [height]",
					Short:          "Query BlockInfo",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "height"}},
				},

				{
					RpcMethod:      "LatestBlocks",
					Use:            "latest-blocks [limit]",
					Short:          "Query LatestBlocks",
					PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "limit"}},
				},

				// this line is used by ignite scaffolding # autocli/query
			},
		},
		Tx: &autocliv1.ServiceCommandDescriptor{
			Service:              types.Msg_serviceDesc.ServiceName,
			EnhanceCustomCommand: true, // only required if you want to use the custom command
			RpcCommandOptions: []*autocliv1.RpcCommandOptions{
				{
					RpcMethod: "UpdateParams",
					Skip:      true, // skipped because authority gated
				},
				// this line is used by ignite scaffolding # autocli/tx
			},
		},
	}
}
