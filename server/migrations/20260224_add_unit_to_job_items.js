const { Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Check if column exists first
        const tableInfo = await queryInterface.describeTable('job_items');
        if (!tableInfo.unit) {
            await queryInterface.addColumn('job_items', 'unit', {
                type: Sequelize.STRING(50),
                allowNull: true,
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('job_items');
        if (tableInfo.unit) {
            await queryInterface.removeColumn('job_items', 'unit');
        }
    }
};
