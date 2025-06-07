# Build the canister
dfx build backend

# Buat folder tujuan jika belum ada
mkdir -p ./api/src/canister/

# Salin hasil build ke folder tertentu
cp -r .dfx/local/canisters/ ./api/src/
