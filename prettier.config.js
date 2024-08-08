module.exports = {
  plugins: [require('prettier-plugin-hbs')],
  overrides: [
    {
      files: "*.hbs",
      options: {
        parser: "html"
      }
    }
  ]
};
