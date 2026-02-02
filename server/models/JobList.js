const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobList = sequelize.define('JobList', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed'),
        defaultValue: 'pending',
        allowNull: false
    },
    created_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'job_lists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = JobList;
