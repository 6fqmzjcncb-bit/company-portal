const { sequelize } = require('./server/models');

async function sync() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

sync();
