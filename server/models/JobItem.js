const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobItem = sequelize.define('JobItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    job_list_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'job_lists',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Nullable! Stoksuz ürünler için
        references: {
            model: 'products',
            key: 'id'
        }
    },
    custom_name: {
        type: DataTypes.STRING(255),
        allowNull: true, // Eğer product_id doluysa bu boş olabilir
        comment: 'Stoksuz ürün adı (örn: "1 Kutu Vida")'
    },
    source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sources',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    quantity_found: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Bulunan/temin edilen miktar (kısmi tamamlama için)'
    },
    quantity_missing: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Eksik miktar'
    },
    missing_source: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Eksik malzeme nereden alınacak (free text)'
    },
    missing_reason: {
        type: DataTypes.ENUM('buy_from_source', 'buy_later'),
        allowNull: true,
        defaultValue: null,
        comment: 'Eksik malzeme sebebi: buy_from_source = başka yerden alınacak, buy_later = daha sonra alınacak'
    },
    is_checked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    checked_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    checked_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'job_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = JobItem;
