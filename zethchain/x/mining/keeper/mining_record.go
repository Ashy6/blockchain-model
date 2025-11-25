package keeper

import (
	"encoding/binary"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// MiningRecord stores mining statistics for an address
type MiningRecord struct {
	LastMineTime int64  // Unix timestamp of last mine
	TotalMined   uint64 // Total uzeth mined
	MineCount    uint64 // Number of successful mines
}

var (
	// MiningRecordKeyPrefix is the prefix for mining record keys
	MiningRecordKeyPrefix = []byte("mining_record/")
)

// GetMiningRecordKey returns the store key for a mining record
func GetMiningRecordKey(address string) []byte {
	return append(MiningRecordKeyPrefix, []byte(address)...)
}

// SetMiningRecord sets the mining record for an address
func (k Keeper) SetMiningRecord(ctx sdk.Context, address string, record MiningRecord) {
	// Encode record
	bz := make([]byte, 24) // 8 bytes for each field
	binary.BigEndian.PutUint64(bz[0:8], uint64(record.LastMineTime))
	binary.BigEndian.PutUint64(bz[8:16], record.TotalMined)
	binary.BigEndian.PutUint64(bz[16:24], record.MineCount)

	// Get the store and set the value
	kvStore := k.storeService.OpenKVStore(ctx)
	key := GetMiningRecordKey(address)
	if err := kvStore.Set(key, bz); err != nil {
		panic(err)
	}
}

// GetMiningRecord gets the mining record for an address
func (k Keeper) GetMiningRecord(ctx sdk.Context, address string) (MiningRecord, bool) {
	kvStore := k.storeService.OpenKVStore(ctx)
	key := GetMiningRecordKey(address)

	bz, err := kvStore.Get(key)
	if err != nil {
		panic(err)
	}

	if bz == nil {
		return MiningRecord{}, false
	}

	// Decode record
	if len(bz) < 24 {
		return MiningRecord{}, false
	}

	record := MiningRecord{
		LastMineTime: int64(binary.BigEndian.Uint64(bz[0:8])),
		TotalMined:   binary.BigEndian.Uint64(bz[8:16]),
		MineCount:    binary.BigEndian.Uint64(bz[16:24]),
	}

	return record, true
}

// UpdateMiningRecord updates the mining record after a successful mine
func (k Keeper) UpdateMiningRecord(ctx sdk.Context, address string, reward uint64) {
	record, found := k.GetMiningRecord(ctx, address)

	if !found {
		record = MiningRecord{
			LastMineTime: ctx.BlockTime().Unix(),
			TotalMined:   reward,
			MineCount:    1,
		}
	} else {
		record.LastMineTime = ctx.BlockTime().Unix()
		record.TotalMined += reward
		record.MineCount++
	}

	k.SetMiningRecord(ctx, address, record)
}
