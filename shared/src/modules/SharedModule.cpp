#include "Module.h"
#include "Namespace.h"
#include "interfaces/IResource.h"

enum class LogType
{
    INFO,
    WARN,
    ERR,
};

template<LogType Type>
static void Log(js::FunctionContext& ctx)
{
    js::IResource* resource = ctx.GetResource();
    // todo: function helper
    v8::Local<v8::Function> inspectFunc = resource->GetBindingExport("logging:inspectMultiple").As<v8::Function>();

    std::vector<v8::Local<v8::Value>> args;
    args.reserve(ctx.GetArgCount() + 1);

    js::Object options;
    options.Set("colors", Type == LogType::INFO);
    args.push_back(options.Get());
    for(int i = 0; i < ctx.GetArgCount(); i++)
    {
        v8::Local<v8::Value> val;
        if(!ctx.GetArgRaw(i, val)) continue;
        args.push_back(val);
    }

    v8::Local<v8::String> msg = inspectFunc->Call(ctx.GetContext(), v8::Undefined(ctx.GetIsolate()), args.size(), args.data()).ToLocalChecked().As<v8::String>();
    std::string msgStr = js::CppValue(msg);
    if constexpr(Type == LogType::INFO) alt::ICore::Instance().LogColored(msgStr);
    else if constexpr(Type == LogType::WARN)
        alt::ICore::Instance().LogWarning(msgStr);
    else if constexpr(Type == LogType::ERR)
        alt::ICore::Instance().LogError(msgStr);
}

// clang-format off
extern js::Class baseObjectClass;
extern js::Namespace enumsNamespace;
static js::Module sharedModule("alt-shared", { &baseObjectClass }, [](js::ModuleTemplate& module)
{
    module.StaticFunction("log", Log<LogType::INFO>);
    module.StaticFunction("logWarn", Log<LogType::WARN>);
    module.StaticFunction("logError", Log<LogType::ERR>);
    // todo: maybe a function to set logger settings like depth, numeric seperator etc.

    module.Namespace("Timers");
    module.Namespace("Events");
    module.Namespace("Utils");
    module.Namespace("Enums", enumsNamespace);
});
