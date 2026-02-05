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
    transaction_type: {
        type: DataTypes.ENUM('payment', 'expense'),
        allowNull: false,
        defaultValue: 'payment',
        comment: 'İşlem tipi: ödeme veya harcama'
    },
    account: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'cash', // 'cash', 'bank_a', 'bank_b'
        comment: 'Ödeme aracı/Hesap'
    },
    period_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Dönem başlangıç (Opsiyonel)'
    },
    period_end: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Dönem bitiş (Opsiyonel)'
    },
    days_worked: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
        allowNull: true,
        defaultValue: DataTypes.NOW
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
