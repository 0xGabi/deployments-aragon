import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const ensFactory = await deploy('ENSFactory', {
    from: deployer,
    args: [],
    log: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'ENSFactory',
      address: ensFactory.address,
    });

    await hre.tenderly.verify({
      name: 'ENSFactory',
      address: ensFactory.address,
    });
  }
};

export default func;

func.tags = ['ENSFactory'];
