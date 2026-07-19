module.exports = {
  default: {
    require: ['features/step_definitions/**/*.js', 'features/support/**/*.js'],
    format: ['progress', '@cucumber/pretty-formatter'],
    publishQuiet: true,
    tags: 'not @skip',
  }
};
