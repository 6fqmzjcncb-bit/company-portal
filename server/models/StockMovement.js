const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockMovement = sequelize.define('StockMovement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    movement_type: {
        type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'),
        allowNull: false,
        comment: 'IN=Giriş, OUT=Çıkış, ADJUSTMENT=Düzenleme'
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // Giriş bilgileri
    brought_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Kim getirdi?'
    },
    source_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nereden geldi?'
    },
    // Çıkış bilgileri
    taken_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Kim aldı?'
    },
    destination: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nereye gitti?'
    },
    job_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'job_lists',
            key: 'id'
        },
        comment: 'Hangi iş listesinde kullanıldı?'
    },
    reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Sebep'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'stock_movements',
    timestamps: true,
    underscored: true
});

module.exports = StockMovement;
