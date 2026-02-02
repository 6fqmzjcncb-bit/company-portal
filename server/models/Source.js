const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Source = sequelize.define('Source', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    color_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'CSS class veya hex kodu (örn: bg-green-100 veya #e0f7e0)'
    },
    type: {
        type: DataTypes.ENUM('internal', 'external'),
        allowNull: false,
        comment: 'internal = depo, external = dışarıdan'
    }
}, {
    tableName: 'sources',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Source;
