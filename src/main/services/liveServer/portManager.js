async function getFreePort() {
    const getPort = (await import('get-port')).default;
    return await getPort({ port: 5500 });
}

module.exports = {
    getFreePort
};
