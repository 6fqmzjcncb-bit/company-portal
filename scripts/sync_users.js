const { sequelize, Employee, User } = require('../server/models');
const bcrypt = require('bcrypt');

try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Ensure schema is updated
    await User.sync({ alter: true });
    console.log('User schema synced.');

    const employees = await Employee.findAll({
        where: { is_active: true }
    });

    console.log(`Found ${employees.length} active employees.`);

    for (const emp of employees) {
        // Check if user exists (linked via user_id or same name?)
        // The Employee model has user_id, check if it's set
        if (emp.user_id) {
            const existingUser = await User.findByPk(emp.user_id);
            if (existingUser) {
                console.log(`Skipping ${emp.full_name} (Already has user ${existingUser.username})`);
                continue;
            }
        }

        // Create User
        let baseUsername = emp.full_name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '.')
            .replace(/\.+/g, '.')
            .replace(/^\.|\.+$/g, '');

        let username = baseUsername;
        let counter = 1;

        while (await User.findOne({ where: { username } })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        const password = await bcrypt.hash('123456', 10);

        const user = await User.create({
            username,
            password,
            full_name: emp.full_name,
            role: 'staff',
            is_active: true
        });

        await emp.update({ user_id: user.id });
        console.log(`Created user ${username} for employee ${emp.full_name}`);
    }

    console.log('Sync complete.');
    process.exit(0);
} catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
}

sync();
