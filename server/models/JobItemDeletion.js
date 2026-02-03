const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobItemDeletion = sequelize.define('JobItemDeletion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    job_list_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    product_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    source_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    deleted_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Silme sebebi (opsiyonel)'
    }
}, {
    tableName: 'job_item_deletions',
    timestamps: false
});

module.exports = JobItemDeletion;
