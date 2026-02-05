const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentAccount = sequelize.define('PaymentAccount', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('cash', 'bank', 'credit_card', 'other'),
        allowNull: false,
        defaultValue: 'cash'
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'TRY'
    },
    icon: {
        type: DataTypes.STRING(10), // E.g. 💵, 🏦
        allowNull: true
    }
}, {
    tableName: 'payment_accounts',
    timestamps: true,
    underscored: true
});

module.exports = PaymentAccount;
