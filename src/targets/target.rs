use core::fmt::{Display, Formatter, Result};
use move_compiler::compiled_unit::CompiledUnit;
use std::path::Path;

use super::sui::SuiTarget;

pub trait Target {
    fn output(
        self,
        units: &[CompiledUnit],
        dest_path: &Path,
        init_function: &str,
    ) -> anyhow::Result<()>;
}

#[derive(Debug)]
pub enum TargetType {
    Sui,
    Unknown,
}

impl Display for TargetType {
    fn fmt(&self, f: &mut Formatter) -> Result {
        match self {
            TargetType::Sui => write!(f, "sui"),
            TargetType::Unknown => write!(f, "unknown"),
        }
    }
}

impl From<String> for TargetType {
    fn from(target_type: String) -> Self {
        match target_type {
            target_type if target_type == "sui" => TargetType::Sui,
            _ => TargetType::Unknown,
        }
    }
}

pub fn output(
    units: &[CompiledUnit],
    target_types: &Vec<TargetType>,
    root_path: &Path,
    init_function: &str,
) -> anyhow::Result<()> {
    let root_dir = root_path.join("target");

    for target_type in target_types {
        match target_type {
            TargetType::Sui => {
                let dest_path = root_dir.join("sui");
                let target = SuiTarget::default();
                target.output(units, dest_path.as_path(), init_function)?;
            }
            _ => anyhow::bail!("not support target type"),
        }
    }

    Ok(())
}
