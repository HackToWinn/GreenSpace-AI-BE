import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(({ command, mode }) => {
    return {
        root: '.',
        build: {
            outDir: 'dist',
        },
        resolve: {
            alias: {
                '@shared': path.resolve(__dirname, 'packages/shared-lib'),
            },
        },
    }
})
