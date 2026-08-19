module.exports = {
  default: {
    require: ['features/**/*.js'],
    format: ['progress'],
    timeout: 10000,  // Increase step timeout from 5s to 10s for CI
    tags: 'not @vercel-only'  // Exclude production-only scenarios from local/CI runs
  }
};
