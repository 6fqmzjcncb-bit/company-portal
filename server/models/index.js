const { sequelize } = require('../config/database');
const User = require('./User');
const Source = require('./Source');
const Product = require('./Product');
const JobList = require('./JobList');
const JobItem = require('./JobItem');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const StockMovement = require('./StockMovement');
const SalaryPayment = require('./SalaryPayment');
const JobView = require('./JobView');
const JobItemDeletion = require('./JobItemDeletion');
const PaymentAccount = require('./PaymentAccount');

// İlişkileri tanımla
// User - Employee ilişkisi (1-1)
User.hasOne(Employee, {
    foreignKey: 'user_id',
    as: 'employee'
});

Employee.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// JobList ilişkileri
JobList.belongsTo(User, {
    foreignKey: 'created_by_user_id',
    as: 'creator'
});

JobList.hasMany(JobItem, {
    foreignKey: 'job_list_id',
    as: 'items',
    onDelete: 'CASCADE'
});

// JobItem ilişkileri
JobItem.belongsTo(JobList, {
    foreignKey: 'job_list_id',
    as: 'jobList'
});

JobItem.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});

JobItem.belongsTo(Source, {
    foreignKey: 'source_id',
    as: 'source'
});

JobItem.belongsTo(User, {
    foreignKey: 'checked_by_user_id',
    as: 'checkedBy'
});

// JobView ilişkileri
JobView.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'viewer'
});

JobView.belongsTo(JobList, {
    foreignKey: 'job_list_id',
    as: 'jobList'
});

// JobItemDeletion ilişkileri
JobItemDeletion.belongsTo(User, {
    foreignKey: 'deleted_by_user_id',
    as: 'deletedBy'
});

// Product ilişkileri
Product.hasMany(StockMovement, {
    foreignKey: 'product_id',
    as: 'movements'
});

// Employee ilişkileri
Employee.hasMany(Attendance, {
    foreignKey: 'employee_id',
    as: 'attendances',
    onDelete: 'CASCADE'
});

Employee.hasMany(SalaryPayment, {
    foreignKey: 'employee_id',
    as: 'payments',
    onDelete: 'CASCADE'
});

// Attendance ilişkileri
Attendance.belongsTo(Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
});

Attendance.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

// StockMovement ilişkileri
StockMovement.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});

StockMovement.belongsTo(JobList, {
    foreignKey: 'job_id',
    as: 'job'
});

StockMovement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

// SalaryPayment ilişkileri
SalaryPayment.belongsTo(Employee, {
    foreignKey: 'employee_id',
    as: 'employee'
});

SalaryPayment.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

module.exports = {
    User,
    Source,
    Product,
    JobList,
    JobItem,
    Employee,
    Attendance,
    StockMovement,
    SalaryPayment,
    JobView,
    JobItemDeletion,
    PaymentAccount,
    sequelize // Export sequelize instance
};
