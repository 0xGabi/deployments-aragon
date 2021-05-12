import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {
  ACL,
  APMRegistry,
  ENS,
  ENSSubdomainRegistrar,
  Kernel,
} from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {deploy, execute, get, log} = deployments;

  const {deployer} = await getNamedAccounts();

  const tldName = 'eth';
  const labelName = 'aragonpm';
  const tldHash = ethers.utils.namehash(tldName);
  const labelHash = ethers.utils.id(labelName);

  const openTldName = 'aragonpm.eth';
  const openLabelName = 'open';
  const openTldHash = ethers.utils.namehash(openTldName);
  const openLabelHash = ethers.utils.id(openLabelName);

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
  const apmFactory = {
    address: '0xb8c830ACebD05537dDDbc45F568aADc5a7cd952D',
  };
  await deploy('APMRegistryFactory', {
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
    deterministicDeployment: true,
  });

  log('Creating subdomain and assigning it to APMRegistryFactory');
  const ens = (await ethers.getContractAt('ENS', ensAddress)) as ENS;
  await ens.setSubnodeOwner(tldHash, labelHash, apmFactory.address);

  // New APM instance
  const {events} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true, gasLimit: 8000000},
    'newAPM',
    tldHash,
    labelHash,
    deployer
  );

  const {apm: apmAddress} = events?.find(
    (event) => event.event == 'DeployAPM'
  ).args;
  log('APM:', apmAddress);

  const apm = (await ethers.getContractAt(
    'APMRegistry',
    apmAddress
  )) as APMRegistry;
  const kernel = (await ethers.getContractAt(
    'Kernel',
    await apm.kernel()
  )) as Kernel;
  const acl = (await ethers.getContractAt('ACL', await kernel.acl())) as ACL;

  const registrar = await apm.registrar();
  const ensSubdomainRegistrar = (await ethers.getContractAt(
    'ENSSubdomainRegistrar',
    registrar
  )) as ENSSubdomainRegistrar;

  log('Create permission for root account on CREATE_NAME_ROLE');
  await acl.grantPermission(
    deployer,
    registrar,
    await ensSubdomainRegistrar.CREATE_NAME_ROLE()
  );

  log('Creating open subdomain and assigning it to APMRegistryFactory');
  await ensSubdomainRegistrar.createName(openLabelHash, apmFactory.address, {
    gasLimit: 8000000,
  });

  // New Open APM instance
  const {events: newApmEvents} = await execute(
    'APMRegistryFactory',
    {from: deployer, log: true, gasLimit: 8000000},
    'newAPM',
    openTldHash,
    openLabelHash,
    deployer
  );

  const {apm: openApmAddress} = newApmEvents?.find(
    (event) => event.event == 'DeployAPM'
  ).args;
  log('Open APM:', openApmAddress);

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts(
      {
        name: 'ENS',
        address: ensAddress,
      },
      {
        name: 'APMRegistryFactory',
        address: apmFactory.address,
      },
      {
        name: 'APMRegistry',
        address: apmAddress,
      },
      {
        name: 'APMRegistry',
        address: openApmAddress,
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
      },
      {
        name: 'APMRegistry',
        address: apmAddress,
      },
      {
        name: 'APMRegistry',
        address: openApmAddress,
      }
    );
  }
};

export default func;

func.tags = ['APM'];

func.dependencies = [
  'APMRegistry',
  'DAOFactory',
  'ENSFactory',
  'ENSSubdomainRegistrar',
  'Repo',
];
