// Material Web and Lit ship syntax newer than webpack 4's parser supports.
module.exports = {
  test: /\.m?js$/,
  include: /node_modules[\\/](?:@material[\\/]web|lit|lit-html|lit-element|@lit[\\/][^\\/]+|@lit-labs[\\/][^\\/]+)[\\/]/,
  loader: 'babel-loader',
};
