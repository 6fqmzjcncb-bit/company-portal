const { Sequelize } = require('sequelize');
const path = require('path');

// SQLite veritabanı bağlantısı
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database/portal.db'),
  logging: false, // SQL sorgularını konsola yazdırmaz
  define: {
    timestamps: true,
    underscored: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /SQLITE_BUSY/,
      /database is locked/
    ],
    name: 'query',
    max: 5 // Retry 5 times if database is busy
  }
});

// Bağlantı testi
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Veritabanı bağlantısı başarılı');
  } catch (error) {
    console.error('✗ Veritabanı bağlantı hatası:', error);
  }
};

module.exports = { sequelize, testConnection };
