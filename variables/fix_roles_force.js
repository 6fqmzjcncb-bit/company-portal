const { User, Role, sequelize } = require('../server/models');

async function fixRoles() {
    try {
        console.log('🔄 Connecting to DB...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        const adminRole = await Role.findOne({ where: { name: 'Yönetici' } });
        const staffRole = await Role.findOne({ where: { name: 'Personel' } });

        if (!adminRole || !staffRole) {
            console.error('❌ System roles not found!');
            return;
        }

        console.log(`ℹ️ Admin Role ID: ${adminRole.id}`);
        console.log(`ℹ️ Staff Role ID: ${staffRole.id}`);

        // Fix Admin
        const adminUser = await User.findOne({ where: { username: 'admin' } });
        if (adminUser) {
            console.log(`👤 Found admin user. Current Role ID: ${adminUser.role_id}`);
            adminUser.role_id = adminRole.id;
            await adminUser.save();
            console.log('✅ Admin user role_id updated.');
        } else {
            console.warn('⚠️ Admin user not found.');
        }

        // Fix Staff
        const staffUser = await User.findOne({ where: { username: 'staff' } });
        if (staffUser) {
            console.log(`👤 Found staff user. Current Role ID: ${staffUser.role_id}`);
            staffUser.role_id = staffRole.id;
            await staffUser.save();
            console.log('✅ Staff user role_id updated.');
        } else {
            console.warn('⚠️ Staff user not found.');
        }

        // Fix 'deneme' user if exists (just in case)
        const denemeUser = await User.findOne({ where: { username: 'deneme' } });
        if (denemeUser) {
            console.log(`👤 Found deneme user. Current Role ID: ${denemeUser.role_id}`);
            // If null, set to staff
            if (!denemeUser.role_id) {
                denemeUser.role_id = staffRole.id;
                await denemeUser.save();
                console.log('✅ Deneme user role_id updated.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

fixRoles();
