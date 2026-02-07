const { Sequelize } = require('sequelize');
const path = require('path');

// Setup independent connection
const dbPath = path.join(__dirname, '../database/portal.db');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const run = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();

        // Define minimal models needed for this op
        const Role = sequelize.define('Role', {
            name: Sequelize.STRING
        }, { timestamps: false, tableName: 'roles' });

        const User = sequelize.define('User', {
            username: Sequelize.STRING,
            role_id: Sequelize.INTEGER,
            role: Sequelize.STRING
        }, { timestamps: true, tableName: 'users' });

        // 1. Get Role IDs
        const adminRole = await Role.findOne({ where: { name: 'Yönetici' } });
        const staffRole = await Role.findOne({ where: { name: 'Personel' } });

        if (!adminRole) return console.error('❌ Role "Yönetici" not found!');
        if (!staffRole) return console.error('❌ Role "Personel" not found!');

        console.log(`ℹ️ IDs -> Yönetici: ${adminRole.id}, Personel: ${staffRole.id}`);

        // 2. Fix Admin
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        if (adminUser) {
            console.log(`👤 Found admin user. Current role_id: ${adminUser.role_id}`);
            await adminUser.update({ role_id: adminRole.id });
            console.log(`✅ Updated admin user to role_id: ${adminRole.id}`);
        } else {
            console.warn('⚠️ User "admin" not found.');
        }

        // 3. Fix Staff
        const staffUser = await User.findOne({ where: { username: 'staff' } });
        if (staffUser) {
            console.log(`👤 Found staff user. Current role_id: ${staffUser.role_id}`);
            await staffUser.update({ role_id: staffRole.id });
            console.log(`✅ Updated staff user to role_id: ${staffRole.id}`);
        } else {
            console.warn('⚠️ User "staff" not found.');
        }

        // 4. Fix others
        const legacyUsers = await User.findAll({ where: { role_id: null } });
        for (const u of legacyUsers) {
            if (u.role === 'admin') {
                await u.update({ role_id: adminRole.id });
                console.log(`✅ Updated ${u.username} (was admin) -> ${adminRole.id}`);
            } else if (u.role === 'staff') {
                await u.update({ role_id: staffRole.id });
                console.log(`✅ Updated ${u.username} (was staff) -> ${staffRole.id}`);
            }
        }

        console.log('✨ Done.');

    } catch (e) {
        console.error('❌ Error:', e);
    }
};

run();
