const { Role } = require('./server/models');

async function listRoles() {
    try {
        const roles = await Role.findAll();
        console.log(JSON.stringify(roles, null, 2));
    } catch (error) {
        console.error(error);
    }
}

listRoles();
