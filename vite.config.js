const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: '',
      name: 'MyLib',
      fileName: (format) => `virtual-bg.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})