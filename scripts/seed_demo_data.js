const { sequelize, Role, PaymentAccount } = require('../server/models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // --- Roles ---
        const roles = [
            {
                name: 'Muhasebe',
                permissions: ['view_dashboard', 'manage_salary', 'view_report'],
                is_system: false
            },
            {
                name: 'Saha Ekibi',
                permissions: ['view_jobs', 'manage_stock'], // Can see jobs and stock
                is_system: false
            },
            {
                name: 'Stok Sorumlusu',
                permissions: ['view_dashboard', 'manage_stock'],
                is_system: false
            }
        ];

        for (const r of roles) {
            const [role, created] = await Role.findOrCreate({
                where: { name: r.name },
                defaults: r
            });
            if (created) console.log(`✅ Rol eklendi: ${role.name}`);
            else console.log(`ℹ️ Rol zaten var: ${role.name}`);
        }

        // --- Payment Accounts ---
        const accounts = [
            {
                name: 'Merkez Kasa',
                type: 'cash',
                icon: '💵'
            },
            {
                name: 'Ziraat Bankası',
                type: 'bank',
                icon: '🏦'
            },
            {
                name: 'Şirket Kredi Kartı',
                type: 'credit_card',
                icon: '💳'
            }
        ];

        for (const a of accounts) {
            const [acc, created] = await PaymentAccount.findOrCreate({
                where: { name: a.name },
                defaults: a
            });
            if (created) console.log(`✅ Hesap eklendi: ${acc.name}`);
            else console.log(`ℹ️ Hesap zaten var: ${acc.name}`);
        }

        console.log('🚀 Demo verileri başarıyla yüklendi!');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

seed();
