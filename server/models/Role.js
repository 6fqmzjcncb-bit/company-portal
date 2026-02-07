const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    permissions: {
        type: DataTypes.JSON, // Stores array of permission strings e.g. ["view_stock", "manage_salary"]
        defaultValue: [],
        allowNull: false
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Cannot be deleted if true'
    }
}, {
    tableName: 'roles',
    timestamps: false
});

module.exports = Role;
