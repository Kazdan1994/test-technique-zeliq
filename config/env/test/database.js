const path = require('path');

module.exports = ({ env }) => ({
  sqlite: {
    connection: {
      filename: path.join(
        __dirname,
        '..',
        env('DATABASE_FILENAME', '.tmp/test.db')
      ),
    },
    useNullAsDefault: true,
  },
});
