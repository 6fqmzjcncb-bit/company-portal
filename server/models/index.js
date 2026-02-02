const User = require('./User');
const Source = require('./Source');
const Product = require('./Product');
const JobList = require('./JobList');
const JobItem = require('./JobItem');

// İlişkileri tanımla
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

module.exports = {
    User,
    Source,
    Product,
    JobList,
    JobItem
};
