import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ensSubdomainRegistrarBase = await deploy('ENSSubdomainRegistrar', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'ENSSubdomainRegistrar',
      address: ensSubdomainRegistrarBase.address,
    });

    await hre.tenderly.verify({
      name: 'ENSSubdomainRegistrar',
      address: ensSubdomainRegistrarBase.address,
    });
  }
};

export default func;

func.tags = ['ENSSubdomainRegistrar'];
