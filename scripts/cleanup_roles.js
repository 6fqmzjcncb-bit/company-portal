const { sequelize } = require('../server/config/database');
const { Role, User } = require('../server/models');

async function cleanupRoles() {
    try {
        console.log('🧹 Cleaning up unused roles...');
        await sequelize.authenticate();

        const rolesToDelete = ['Muhasebe', 'Saha Ekibi'];

        for (const roleName of rolesToDelete) {
            const role = await Role.findOne({ where: { name: roleName } });
            if (role) {
                // Find users with this role and remove relation (or set to null)
                const users = await User.findAll({ where: { role_id: role.id } });
                for (const user of users) {
                    console.log(`⚠️ User ${user.username} had role ${roleName}. Setting role to NULL.`);
                    user.role_id = null;
                    await user.save();
                }

                await role.destroy();
                console.log(`✅ Role deleted: ${roleName}`);
            } else {
                console.log(`ℹ️ Role not found: ${roleName}`);
            }
        }

        console.log('✨ Cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanupRoles();
