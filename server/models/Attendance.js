const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'employees',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    worked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Çalıştı mı?'
    },
    hours_worked: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Kaç saat çalıştı?'
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nereye gitti?'
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
    tableName: 'attendance',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['employee_id', 'date']
        }
    ]
});

module.exports = Attendance;
