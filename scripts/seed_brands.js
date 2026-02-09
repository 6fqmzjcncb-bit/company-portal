const { Product, sequelize } = require('../server/models');

const BRANDS = [
    'Fırat', 'Egeplast', 'Pilsa', 'Dizayn', 'Hakan Plastik',
    'Bosch', 'Makita', 'Dewalt', 'Hilti', 'Einhell',
    'ECA', 'Artema', 'Vitra', 'Kale', 'Serel',
    'Demirdöküm', 'Vaillant', 'Buderus', 'Viessmann', 'Baymak',
    'Marshal', 'Filli Boya', 'Dyo', 'Polisan', 'Jotun'
];

async function seedBrands() {
    try {
        await sequelize.authenticate();
        console.log('Veritabanı bağlantısı başarılı.');

        const products = await Product.findAll();

        for (const product of products) {
            if (!product.brand) {
                const randomBrand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
                await product.update({ brand: randomBrand });
                console.log(`Updated ${product.name} -> Brand: ${randomBrand}`);
            }
        }

        console.log('✅ Marka ataması tamamlandı.');
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

seedBrands();
