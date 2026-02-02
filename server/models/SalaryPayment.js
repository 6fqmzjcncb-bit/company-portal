const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SalaryPayment = sequelize.define('SalaryPayment', {
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
    period_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Dönem başlangıç'
    },
    period_end: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Dönem bitiş'
    },
    days_worked: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    total_hours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Toplam çalışılan saat'
    },
    amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Ödenen miktar'
    },
    payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
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
    tableName: 'salary_payments',
    timestamps: true,
    underscored: true
});

module.exports = SalaryPayment;
