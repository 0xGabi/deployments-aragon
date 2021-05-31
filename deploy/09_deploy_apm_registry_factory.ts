import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {deploy, execute, get, log} = deployments;

  const {deployer} = await getNamedAccounts();

  const daoFactory = await get('DAOFactory');
  const apmRegistryBase = await get('APMRegistry');
  const apmRepoBase = await get('Repo');
  const ensSubdomainRegistrarBase = await get('ENSSubdomainRegistrar');

  let ensAddress;
  if (!process.env.ENS) {
    // New ENS instance
    const {events: newEnsEvents} = await execute(
      'ENSFactory',
      {from: deployer, log: true},
      'newENS',
      deployer
    );

    const {args} = newEnsEvents?.find((event) => event.event == 'DeployENS');
    ensAddress = args.ens;
  }
  ensAddress = process.env.ENS ?? ensAddress;
  log('ENS:', ensAddress);

  // Deploy APMRegistryFactory
  const apmFactory = await deploy('APMRegistryFactory', {
    from: deployer,
    args: [
      daoFactory.address,
      apmRegistryBase.address,
      apmRepoBase.address,
      ensSubdomainRegistrarBase.address,
      ensAddress,
      ethers.constants.AddressZero,
    ],
    log: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts(
      {
        name: 'ENS',
        address: ensAddress,
      },
      {
        name: 'APMRegistryFactory',
        address: apmFactory.address,
      }
    );

    await hre.tenderly.verify(
      {
        name: 'ENS',
        address: ensAddress,
      },
      {
        name: 'APMRegistryFactory',
        address: apmFactory.address,
      }
    );
  }
};

export default func;

func.tags = ['APMRegistryFactory'];

func.dependencies = [
  'APMRegistry',
  'DAOFactory',
  'ENSFactory',
  'ENSSubdomainRegistrar',
  'Repo',
];
