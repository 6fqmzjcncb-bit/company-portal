const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    barcode: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true
    },
    current_stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'adet'
    },
    brand: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Product;
