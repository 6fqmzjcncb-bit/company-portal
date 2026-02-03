const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobView = sequelize.define('JobView', {
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
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    viewed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'job_views',
    timestamps: false
});

module.exports = JobView;
