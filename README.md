# 💻 Usage

- Install NPM Package
```
npm install
```

- Start the local ICP network
```
dfx start --background --clean
```

- Generate the canister IDs
```
dfx generate
```

- If you encounter issues during generate the canister IDs, use the following command to deploy the application:
```
dfx deploy
```

- If you encounter issues during deployment again, use the following command to fix:
```
dfx generate
dfx deploy
```

- For frontend build
```
npm run build
```

- For frontend development
```
npm run dev
```
