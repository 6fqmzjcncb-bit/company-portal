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
