const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    full_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Will be populated by migration
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    // Legacy role field (kept for backward compatibility during migration)
    role: {
        type: DataTypes.ENUM('admin', 'staff'),
        defaultValue: 'staff',
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = User;
