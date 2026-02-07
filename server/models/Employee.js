const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    full_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        comment: 'Bağlı kullanıcı ID'
    },
    role: {
        type: DataTypes.STRING(50), // Changed from ENUM to STRING to allow custom titles
        defaultValue: 'Personel'
    },
    daily_wage: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Günlük ücret'
    },
    monthly_salary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Aylık maaş (opsiyonel)'
    },
    hire_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Hakediş hesaplaması için başlangıç tarihi (Son ödeme tarihi)'
    },
    termination_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'İşten ayrılış tarihi'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'employees',
    timestamps: true,
    underscored: true
});

module.exports = Employee;
