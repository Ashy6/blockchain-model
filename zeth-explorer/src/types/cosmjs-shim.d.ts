// Shim type declarations for CosmJS packages to satisfy TypeScript module resolution in CRA (TS 4.9)
declare module '@cosmjs/encoding';
declare module '@cosmjs/crypto';
declare module '@cosmjs/amino';
// Add stubs for other CosmJS packages used in services
declare module '@cosmjs/stargate';
declare module '@cosmjs/proto-signing';